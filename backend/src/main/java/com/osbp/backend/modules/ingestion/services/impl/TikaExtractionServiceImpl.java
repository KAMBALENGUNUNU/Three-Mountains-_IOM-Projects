package com.osbp.backend.modules.ingestion.services.impl;

import com.osbp.backend.modules.ingestion.services.TikaExtractionService;
import com.osbp.backend.modules.manual.models.Section;
import com.osbp.backend.modules.manual.models.SubTopic;
import com.osbp.backend.modules.manual.models.Topic;
import com.osbp.backend.modules.manual.repositories.SectionRepository;
import com.osbp.backend.modules.manual.repositories.SubTopicRepository;
import com.osbp.backend.modules.manual.repositories.TopicRepository;
import com.osbp.backend.modules.search.services.LuceneIndexService;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.ContentHandler;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Implementation of {@link TikaExtractionService} that extracts and digests
 * the OSBP Learner Manual into the Topic -> SubTopic -> Section hierarchy
 * matching the PDF Table of Contents 1:1, and updates the Apache Lucene search index.
 */
@Service
public class TikaExtractionServiceImpl implements TikaExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TikaExtractionServiceImpl.class);

    private static final Pattern TOPIC_PATTERN = Pattern.compile("^TOPIC\\s+(\\d+):\\s*(.+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SUBTOPIC_PATTERN = Pattern.compile("^(\\d+)\\.(\\d+)\\.?\\s*(.+)$");
    private static final Pattern PAGE_NUMBER_PATTERN = Pattern.compile("^\\d+(\\s*\\|\\s*Page)?$");

    // Known subtopic anomalies in the PDF source text
    private static final Pattern MIGRATION_DEV_PATTERN = Pattern.compile("^1\\.\\s+MIGRATION\\s+AND\\s+DEVELOPMENT.*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern INST_FRAMEWORK_PATTERN = Pattern.compile("^2\\.9\\.\\s+INSTITUTIONAL\\s+FRAMEWORK.*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SOFT_LAW_PATTERN = Pattern.compile("^2\\.10\\s+SOFT\\s+LAW.*$", Pattern.CASE_INSENSITIVE);

    private static final Set<String> KNOWN_SECTION_HEADERS = new HashSet<>(Arrays.asList(
            // Topic 0
            "MODULE TITLE", "COURSE DESCRIPTION", "COURSE OBJECTIVES", "LEARNING OUTCOMES", "DELIVERY METHODS", "TARGET GROUP",
            // Subtopic 1.2
            "MIGRATION", "REFUGEE", "ASYLUM-SEEKERS", "CROSS-BORDER MOVEMENT", "DISPLACED PERSONS",
            "ECONOMIC MIGRATION", "EMIGRATION", "ENVIRONMENTAL MIGRATION", "HUMANITARIAN BORDER MANAGEMENT (HBM)",
            "FAMILY REUNIFICATION (RIGHT TO)", "IMMIGRATION", "INTERNATIONAL MIGRATION", "INTERNAL MIGRATION",
            "IRREGULAR MIGRATION", "LABOUR MIGRATION", "MIXED MIGRATION", "MOBILITY CONTINUUM", "REFUGEES",
            "SAFE, ORDERLY, AND REGULAR MIGRATION", "TRANSHUMANCE/SEASONAL MIGRATION", "TRANSNATIONALISM", "VOLUNTARY MIGRATION",
            // Subtopic 1.8
            "POLICY DEVELOPMENT AND IMPLEMENTATION", "DATA COLLECTION AND ANALYSIS", "BORDER MANAGEMENT",
            "PROTECTION OF MIGRANTS", "ADDRESSING IRREGULAR MIGRATION", "COOPERATION, COORDINATION, AND PARTNERSHIPS IN MANAGING MIGRATION",
            // Subtopic 2.1
            "ADMISSION AND STAY", "DETENTION", "EXPULSION",
            // Subtopic 2.5
            "THE CONVENTION AGAINST TRANSNATIONAL ORGANIZED CRIME",
            "THE PROTOCOL TO PREVENT, SUPPRESS, AND PUNISH TRAFFICKING IN PERSONS",
            "THE PROTOCOL AGAINST THE SMUGGLING OF MIGRANTS BY LAND, SEA AND AIR",
            // Subtopic 2.7
            "THE 1969 OAU CONVENTION FOR REFUGEES", "THE AFRICAN CHARTER ON HUMAN AND PEOPLES' RIGHTS",
            "THE AFRICAN CHARTER ON HUMAN AND PEOPLES’ RIGHTS", "FREE MOVEMENT OF PERSONS PROTOCOL (AU)",
            // Subtopic 2.8
            "THE EAST AFRICAN COMMUNITY (EAC) TREATY", "THE EAC COMMON MARKET PROTOCOL",
            // Subtopic 2.9
            "MIGRATION LAW", "MIGRATION POLICIES", "REGULATIONS ON MIGRATION",
            // Subtopic 2.10
            "THE EAC OSBP ACT", "THE EAC OSBP PROCEDURES MANUAL", "BILATERAL AGREEMENTS",
            // Subtopic 2.11
            "THE INTERNATIONAL LABOUR ORGANIZATION (ILO) MIGRATION FOR EMPLOYMENT CONVENTION",
            "DECLARATION ON THE HUMAN RIGHTS OF INDIVIDUALS WHO ARE NOT NATIONALS OF THE COUNTRY IN WHICH THEY LIVE",
            "THE ILO DECLARATION OF FUNDAMENTAL PRINCIPLES AND RIGHTS AT WORK",
            "DECLARATION ON THE RIGHTS OF PERSONS BELONGING TO NATIONAL OR ETHNIC, RELIGIOUS OR LINGUISTIC MINORITIES",
            "DURBAN DECLARATION AND PROGRAMME OF ACTION",
            "RECOMMENDED PRINCIPLES AND GUIDELINES ON HUMAN RIGHTS AND HUMAN TRAFFICKING",
            "PACT ON SECURITY, STABILITY, AND DEVELOPMENT IN THE GREAT LAKES REGION",
            "GLOBAL COMPACT FOR SAFE, ORDERLY, AND REGULAR MIGRATION (GCM)",
            "AU MIGRATION POLICY FRAMEWORK FOR AFRICA (2018-2030)",
            // Subtopic 3.1
            "MACHINE READABLE TRAVEL DOCUMENTS (MRTD)", "NON-READABLE TRAVEL DOCUMENTS",
            "CATEGORIES OF PASSPORTS ISSUED IN EAC", "ORDINARY PASSPORTS", "SERVICE PASSPORTS",
            "DIPLOMATIC PASSPORTS", "EMERGENCY TRAVEL DOCUMENTS/LAISSEZ- PASSER", "EMERGENCY TRAVEL DOCUMENTS/LAISSEZ-PASSER",
            "CEPGL LAISSEZ-PASSER", "E-ID CARD", "UNITED NATIONS LAISSEZ-PASSER",
            "GENEVA CONVENTION TRAVEL DOCUMENTS", "CERTIFICATE OF IDENTITY",
            // Subtopic 3.3
            "ORGANIZATIONAL STRUCTURE, INTERNAL SECURITY AND GENERAL SECURITY PRACTICES",
            "APPLICATION PROCESSES", "ENTITLEMENT PROCESSES", "TREATMENT OF MATERIALS AND BLANK BOOKS",
            "PERSONALIZATION AND DELIVERY", "DOCUMENT SECURITY", "FACILITY SECURITY AND INFORMATION TECHNOLOGY SECURITY",
            "LOST AND STOLEN TRAVEL DOCUMENTS", "OVERSEAS ISSUANCE", "NATIONAL AND INTERNATIONAL STAKEHOLDERS",
            // Subtopic 3.5
            "ORDINARY VISA (SINGLE ENTRY VISA)", "MULTIPLE ENTRY VISA", "GRATIS VISA", "TRANSIT VISA",
            "BUSINESS VISA", "STUDENT VISA", "ESTABLISHMENT VISA OF TWO YEARS", "PERMANENT RESIDENT VISA", "REFERRAL VISA",
            // Subtopic 3.6
            "EXEMPTION CERTIFICATE", "MIGRANT PASS", "STUDENT PASS", "DEPENDENT PASS", "VISITORS PASS",
            "BUSINESS PASS", "RE-ENTRY PASS", "SPECIAL PASS", "IN TRANSIT PASS/INTER-STATE PASS", "LANDING PASS",
            // Subtopic 4.1
            "RECEIPT OF PASSENGERS (UPON ARRIVAL)", "TRAVEL DOCUMENT IDENTIFICATION", "TRAVELLER PROFILING",
            "ITINERARY CHECK", "DATA REGISTRATION", "STATUS ENDORSEMENT", "MANAGEMENT OF EXCEPTIONAL CASES",
            // Subtopic 5.2
            "ETIQUETTE", "DRESS CODE", "CODE OF CONDUCT", "ETHICS AND INTEGRITY", "TIME MANAGEMENT", "TEAMWORK",
            // Subtopic 7.1 & 7.2
            "PROFIT", "POVERTY AND UNEMPLOYMENT", "POLITICAL INSTABILITY AND CONFLICT",
            "WEAK GOVERNANCE AND CORRUPTION", "DEMAND FOR ILLEGAL GOODS AND SERVICES",
            // Subtopic 7.3
            "IMPROVE INTELLIGENCE GATHERING", "STRENGTHEN BORDER CONTROLS", "IMPLEMENT JOINT OPERATIONS",
            "ENGAGE IN COMMUNITY OUTREACH", "STRENGTHEN LEGAL FRAMEWORKS", "TRAINING OF BORDER OFFICIALS",
            // Subtopic 7.4
            "REGULAR MEETINGS", "JOINT TRAINING", "INFORMATION SHARING PLATFORMS",
            "STANDARD OPERATING PROCEDURES (SOP)", "COORDINATION MECHANISMS", "CROSS-BORDER COOPERATION",
            // Subtopic 7.5
            "GLOBAL AND REGIONAL LEGAL FRAMEWORK TO COMBAT TIP", "THE 4P’S APPROACH TO COMBATTING TIP",
            "THE 4P'S APPROACH TO COMBATTING TIP", "REDUCING TRAFFICKING IN PERSONS THROUGH OSBP IN EAST AFRICA",
            // Subtopic 7.6
            "FORMS OF HUMAN SMUGGLING",
            // Subtopic 7.7
            "COUNTER-TERRORISM MEASURES", "INFORMATION SHARING FOR COUNTER-TERRORISM IN EAST AFRICA",
            "GLOBAL AND REGIONAL FRAMEWORK TO COMBAT TERRORISM",
            "THE COUNTER-TERRORISM CENTER (CTC) - AU", "THE COUNTER-TERRORISM CENTER (CTC) – IGAD",
            "JOINT COUNTER-TERRORISM UNIT (JCTU) - THE EAC", "THE GLOBAL COUNTER-TERRORISM FORUM (GCTF)",
            // Subtopic 8.1
            "FACTORS ATTRIBUTED TO MIGRANT VULNERABILITY", "PROTECTING VULNERABLE MIGRANTS AT THE OSBP",
            // Subtopic 8.2
            "PREPAREDNESS AND MITIGATION IN AN OSBP SETTING (PRE-CRISIS)",
            "RESPONDING TO A CRISIS IN AN OSBP SETTING (IN-CRISIS)",
            "RECOVERING FROM A CRISIS IN AN OSBP SETTING (POST-CRISIS)",
            // Subtopic 8.3
            "CAPACITY", "DISASTER", "DISASTER MANAGEMENT", "DISASTER RISK", "DISASTER RISK REDUCTION (DRR)",
            "HAZARD", "SLOW-ONSET DISASTER", "SUDDEN-ONSET DISASTER", "RESILIENCE", "VULNERABILITY",
            "KEY ACTORS IN DISASTER MANAGEMENT", "FRAMEWORKS AND APPROACHES FOR ADDRESSING DISASTER RISK REDUCTION",
            "REDUCING MIGRANTS’ VULNERABILITY TO NATURAL DISASTERS"
    ));

    private final TopicRepository topicRepository;
    private final SubTopicRepository subTopicRepository;
    private final SectionRepository sectionRepository;
    private final LuceneIndexService luceneIndexService;

    public TikaExtractionServiceImpl(
            TopicRepository topicRepository,
            SubTopicRepository subTopicRepository,
            SectionRepository sectionRepository,
            LuceneIndexService luceneIndexService) {
        this.topicRepository = topicRepository;
        this.subTopicRepository = subTopicRepository;
        this.sectionRepository = sectionRepository;
        this.luceneIndexService = luceneIndexService;
    }

    @Override
    @Transactional
    public void extractAndIngest(MultipartFile file) throws Exception {
        log.info("Starting PDF ingestion from uploaded file: {}", file.getOriginalFilename());
        try (InputStream stream = file.getInputStream()) {
            extractAndIngest(stream, file.getOriginalFilename());
        }
    }

    @Override
    @Transactional
    public void extractAndIngest(File file) throws Exception {
        log.info("Starting PDF ingestion from local file: {}", file.getAbsolutePath());
        try (InputStream stream = new FileInputStream(file)) {
            extractAndIngest(stream, file.getName());
        }
    }

    @Override
    @Transactional
    public void extractAndIngest(InputStream stream, String sourceName) throws Exception {
        log.info("Extracting raw text via Apache Tika for: {}", sourceName);
        String rawText = extractTextWithTika(stream);
        log.info("Extracted {} characters of text.", rawText.length());

        // Clear existing manual content
        sectionRepository.deleteAll();
        subTopicRepository.deleteAll();
        topicRepository.deleteAll();
        log.info("Cleared previous manual records from the database.");

        // Parse into Topic -> SubTopic -> Section hierarchy matching PDF TOC 1:1
        List<Topic> topics = parseTextToHierarchy(rawText);
        log.info("Parsed {} topics from manual text.", topics.size());

        // Persist to database
        topicRepository.saveAll(topics);
        log.info("Saved all topics, subtopics, and sections successfully.");

        // Rebuild full-text Lucene index
        luceneIndexService.rebuildIndex();
        log.info("Rebuilt Lucene index successfully.");
    }

    private String extractTextWithTika(InputStream stream) throws Exception {
        AutoDetectParser parser = new AutoDetectParser();
        ContentHandler handler = new BodyContentHandler(-1);
        Metadata metadata = new Metadata();
        ParseContext context = new ParseContext();

        parser.parse(stream, handler, metadata, context);
        return handler.toString();
    }

    private List<Topic> parseTextToHierarchy(String rawText) {
        List<Topic> topics = new ArrayList<>();
        String[] lines = rawText.split("\\r?\\n");

        Topic currentTopic = null;
        SubTopic currentSubTopic = null;
        Section currentSection = null;
        StringBuilder contentBuffer = new StringBuilder();
        StringBuilder pendingTopicIntro = new StringBuilder();

        boolean bodyStarted = false;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            // Wait until TOC ends and Preliminaries start (LIST OF FIGURES without dots)
            if (!bodyStarted) {
                if (line.equalsIgnoreCase("LIST OF FIGURES") && !lines[i].contains("...")) {
                    bodyStarted = true;
                    currentTopic = new Topic(0, "PRELIMINARIES & CURRICULUM");
                    topics.add(currentTopic);
                    currentSubTopic = new SubTopic(1, "LIST OF FIGURES", currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);
                    currentSection = new Section("List of Figures", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                } else {
                    continue;
                }
            }

            // Filter out pagination numbers and running headers/footers
            if (PAGE_NUMBER_PATTERN.matcher(line).matches()) continue;
            if (line.startsWith("EAC | February 2024") || line.startsWith("LEARNER MANUAL")) continue;
            if (line.contains("................")) continue;

            // Topic 0 preliminaries transitions
            if (currentTopic != null && currentTopic.getTopicNumber() == 0) {
                if (line.equalsIgnoreCase("LIST OF TABLES")) {
                    flushSection(currentSection, contentBuffer);
                    contentBuffer.setLength(0);
                    currentSubTopic = new SubTopic(2, "LIST OF TABLES", currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);
                    currentSection = new Section("List of Tables", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                }
                if (line.equalsIgnoreCase("LIST OF ACRONYMS")) {
                    flushSection(currentSection, contentBuffer);
                    contentBuffer.setLength(0);
                    currentSubTopic = new SubTopic(3, "LIST OF ACRONYMS", currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);
                    currentSection = new Section("List of Acronyms", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                }
                if (line.equalsIgnoreCase("CURRICULUM FOR THE MIGRATION MANAGEMENT MODULE")) {
                    flushSection(currentSection, contentBuffer);
                    contentBuffer.setLength(0);
                    currentSubTopic = new SubTopic(4, "CURRICULUM FOR THE MIGRATION MANAGEMENT MODULE", currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);
                    currentSection = new Section("Curriculum Overview", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                }
            }

            // Check REFERENCES section at end of document
            if (line.equalsIgnoreCase("REFERENCES")) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);

                currentTopic = new Topic(9, "References");
                topics.add(currentTopic);
                currentSubTopic = new SubTopic(1, "Bibliography & Reference Materials", currentTopic);
                currentTopic.addSubTopic(currentSubTopic);
                currentSection = new Section("References", "", currentSubTopic);
                currentSubTopic.addSection(currentSection);
                continue;
            }

            // Check Topic Header (e.g. TOPIC 1: MIGRATION MANAGEMENT)
            Matcher topicMatcher = TOPIC_PATTERN.matcher(line);
            if (topicMatcher.matches()) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);
                pendingTopicIntro.setLength(0);

                int topicNum = Integer.parseInt(topicMatcher.group(1));
                String title = cleanTitle(topicMatcher.group(2));
                currentTopic = new Topic(topicNum, title);
                topics.add(currentTopic);
                currentSubTopic = null;
                currentSection = null;
                continue;
            }

            // If we are in a Topic but haven't encountered Subtopic X.1 yet, collect opening text
            if (currentTopic != null && currentSubTopic == null) {
                // Check if this line is SubTopic X.1
                Matcher subTopicMatcher = SUBTOPIC_PATTERN.matcher(line);
                if (subTopicMatcher.matches() && Integer.parseInt(subTopicMatcher.group(1)) == currentTopic.getTopicNumber()) {
                    int sNum = Integer.parseInt(subTopicMatcher.group(2));
                    String subTitle = cleanTitle(subTopicMatcher.group(3));
                    currentSubTopic = new SubTopic(sNum, subTitle, currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);

                    // Attach the introductory paragraphs before X.1 directly into X.1 as the first section!
                    if (!pendingTopicIntro.isEmpty()) {
                        Section introSec = new Section("Topic Overview & Background", pendingTopicIntro.toString().trim(), currentSubTopic);
                        currentSubTopic.addSection(introSec);
                        pendingTopicIntro.setLength(0);
                    }

                    currentSection = new Section("Overview", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                } else {
                    if (!pendingTopicIntro.isEmpty()) {
                        pendingTopicIntro.append("\n");
                    }
                    pendingTopicIntro.append(line);
                    continue;
                }
            }

            // Handle special subtopics
            if (currentTopic != null && currentTopic.getTopicNumber() == 1 && MIGRATION_DEV_PATTERN.matcher(line).matches()) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);

                currentSubTopic = new SubTopic(4, "Migration and Development", currentTopic);
                currentTopic.addSubTopic(currentSubTopic);
                currentSection = new Section("Overview", "", currentSubTopic);
                currentSubTopic.addSection(currentSection);
                continue;
            }
            if (currentTopic != null && currentTopic.getTopicNumber() == 2 && INST_FRAMEWORK_PATTERN.matcher(line).matches()) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);

                currentSubTopic = new SubTopic(10, "Institutional Framework for the OSBP", currentTopic);
                currentTopic.addSubTopic(currentSubTopic);
                currentSection = new Section("Overview", "", currentSubTopic);
                currentSubTopic.addSection(currentSection);
                continue;
            }
            if (currentTopic != null && currentTopic.getTopicNumber() == 2 && SOFT_LAW_PATTERN.matcher(line).matches()) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);

                currentSubTopic = new SubTopic(11, "Soft Law Instruments and Other Guidance", currentTopic);
                currentTopic.addSubTopic(currentSubTopic);
                currentSection = new Section("Overview", "", currentSubTopic);
                currentSubTopic.addSection(currentSection);
                continue;
            }

            // Standard SubTopic pattern (e.g. 1.2, 2.3, 3.1)
            Matcher subTopicMatcher = SUBTOPIC_PATTERN.matcher(line);
            if (subTopicMatcher.matches()) {
                int tNum = Integer.parseInt(subTopicMatcher.group(1));
                int sNum = Integer.parseInt(subTopicMatcher.group(2));
                String subTitle = cleanTitle(subTopicMatcher.group(3));

                if (currentTopic != null && tNum == currentTopic.getTopicNumber() && isLikelySubtopicTitle(subTitle)) {
                    flushSection(currentSection, contentBuffer);
                    contentBuffer.setLength(0);

                    currentSubTopic = new SubTopic(sNum, subTitle, currentTopic);
                    currentTopic.addSubTopic(currentSubTopic);
                    currentSection = new Section("Overview", "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                    continue;
                }
            }

            // Check Section header within SubTopic
            if (currentSubTopic != null && isSectionHeader(line)) {
                flushSection(currentSection, contentBuffer);
                contentBuffer.setLength(0);

                String sectionTitle = cleanTitle(line);
                if (currentSection != null && currentSection.getTitle().equals("Overview")
                        && (currentSection.getContent() == null || currentSection.getContent().isBlank())) {
                    currentSection.setTitle(sectionTitle);
                } else {
                    currentSection = new Section(sectionTitle, "", currentSubTopic);
                    currentSubTopic.addSection(currentSection);
                }
                continue;
            }

            // Regular content line
            if (currentSection != null) {
                if (!contentBuffer.isEmpty()) {
                    contentBuffer.append("\n");
                }
                contentBuffer.append(line);
            }
        }

        // Flush trailing section
        flushSection(currentSection, contentBuffer);

        // Remove placeholder sections that ended up completely empty
        for (Topic t : topics) {
            for (SubTopic st : t.getSubTopics()) {
                if (st.getSections().size() > 1) {
                    st.getSections().removeIf(s -> s.getContent() == null || s.getContent().trim().isEmpty());
                }
                for (Section s : st.getSections()) {
                    if (s.getContent() == null || s.getContent().trim().isEmpty()) {
                        s.setContent(s.getTitle());
                    }
                }
            }
        }

        return topics;
    }

    private void flushSection(Section section, StringBuilder buffer) {
        if (section != null && !buffer.isEmpty()) {
            if (section.getContent() != null && !section.getContent().isEmpty()) {
                section.setContent(section.getContent() + "\n" + buffer.toString().trim());
            } else {
                section.setContent(buffer.toString().trim());
            }
        }
    }

    private String cleanTitle(String raw) {
        String clean = raw.replaceAll("\\d+$", "").trim();
        clean = clean.replaceAll("^[\\.\\:\\-\\s]+|[\\.\\:\\-\\s]+$", "").trim();
        if (clean.length() > 500) {
            clean = clean.substring(0, 500);
        }
        return clean;
    }

    private boolean isLikelySubtopicTitle(String title) {
        if (title.length() < 3 || title.length() > 150) return false;
        return title.equals(title.toUpperCase()) || Character.isUpperCase(title.charAt(0));
    }

    private boolean isSectionHeader(String line) {
        String upper = line.trim().toUpperCase();
        if (KNOWN_SECTION_HEADERS.contains(upper)) {
            return true;
        }
        if (upper.startsWith("TEXT BOX ") && upper.contains(":")) {
            return true;
        }
        if (upper.startsWith("TABLE ") && upper.contains(":")) {
            return true;
        }
        return false;
    }
}
