package com.example.retrieval_search;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class RetrievalSearchApplication {

	public static void main(String[] args) {
		SpringApplication.run(RetrievalSearchApplication.class, args);
	}

}
