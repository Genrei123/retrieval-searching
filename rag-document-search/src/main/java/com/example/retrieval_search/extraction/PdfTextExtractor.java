package com.example.retrieval_search.extraction;

import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.parser.pdf.PDFParser;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;

/** PDF/DOCX ingestion per spec §4 step 3 uses Apache Tika; POC wires PDF only. */
@Component
public class PdfTextExtractor implements TextExtractor {

    @Override
    public boolean supports(String contentType) {
        return "pdf".equalsIgnoreCase(contentType);
    }

    @Override
    public ExtractedText extract(byte[] bytes) {
        try {
            BodyContentHandler handler = new BodyContentHandler(-1);
            new PDFParser().parse(new ByteArrayInputStream(bytes), handler, new Metadata(), new ParseContext());
            return new ExtractedText(handler.toString());
        } catch (Exception e) {
            throw new ExtractionException("Failed to extract text from PDF", e);
        }
    }
}
