package com.example.retrieval_search.domain;

/** Who owns a calendar row, and therefore whether the API will let you change it. */
public enum EventKind {
    /** Created through the API by the user; editable and deletable. */
    PERSONAL,
    /** Seeded reference data (Philippine holidays); read-only. */
    HOLIDAY
}
