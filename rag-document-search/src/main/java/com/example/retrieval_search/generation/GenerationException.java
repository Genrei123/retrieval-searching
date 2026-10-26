package com.example.retrieval_search.generation;

/** Safe, actionable messages; never include provider response bodies or credentials. */
public class GenerationException extends RuntimeException {
    public GenerationException(String message) { super(message); }
}
