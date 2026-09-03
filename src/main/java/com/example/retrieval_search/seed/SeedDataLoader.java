package com.example.retrieval_search.seed;

import com.example.retrieval_search.ingestion.IngestionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Ingests the bundled demo corpus (src/main/resources/seed-docs) on startup, idempotently. */
@Component
public class SeedDataLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);

    private final IngestionService ingestionService;

    public SeedDataLoader(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:seed-docs/*");

        for (Resource resource : resources) {
            String filename = resource.getFilename();
            if (filename == null) {
                continue;
            }
            String contentType = contentTypeOf(filename);
            if (contentType == null) {
                continue;
            }
            String title = titleOf(filename);
            byte[] bytes = resource.getContentAsByteArray();

            IngestionService.IngestOutcome outcome =
                    ingestionService.ingest(
                            title, "classpath:seed-docs/" + filename, contentType, "seed-1", filename, bytes);
            log.info("Seed ingest [{}]: {} ({})", title, outcome.status(), outcome.message());
        }
    }

    private String contentTypeOf(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".md")) {
            return "markdown";
        }
        if (lower.endsWith(".pdf")) {
            return "pdf";
        }
        return null;
    }

    private String titleOf(String filename) {
        String base = filename.replaceAll("\\.(md|pdf)$", "");
        String[] words = base.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            if (title.length() > 0) {
                title.append(' ');
            }
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return title.toString();
    }
}
