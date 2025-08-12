from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re
from app.services.gemini import extract_skills

class SimilarityChecker:
    def __init__(self):
        # Load a lightweight model for now (all-MiniLM-L6-v2 is ~80MB)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.skill_separators = re.compile(r'[,;/\|]')

    def preprocess_skills(self, text):
        """Convert skills text into clean list of skills"""
        skills = [s.strip().lower() for s in self.skill_separators.split(text) if s.strip()]
        return list(set(skills))  # Remove duplicates

    def get_embedding(self, text):
        """Generate embedding for a text"""
        return self.model.encode(text)

    def calculate_similarity(self, resume_text, job_desc):
        """
        Calculate cosine similarity between resume and job description
        Returns: {
            "overall_score": float,
            "skill_similarity": float,
            "combined_score": float
        }
        """
        # Full text similarity
        resume_embedding = self.get_embedding(resume_text)
        job_embedding = self.get_embedding(job_desc)
        overall_score = cosine_similarity(
            [resume_embedding],
            [job_embedding]
        )[0][0]

        # Skill-based similarity
        resume_skills = self.preprocess_skills(', '.join(extract_skills(resume_text)))
        job_skills = self.preprocess_skills(', '.join(extract_skills(job_desc)))
        
        if not resume_skills or not job_skills:
            skill_similarity = 0.0
        else:
            resume_skill_embedding = self.get_embedding(' '.join(resume_skills))
            job_skill_embedding = self.get_embedding(' '.join(job_skills))
            skill_similarity = cosine_similarity(
                [resume_skill_embedding],
                [job_skill_embedding]
            )[0][0]

        # Combined score (weighted average)
        combined_score = (0.6 * skill_similarity) + (0.4 * overall_score)

        return {
            "overall_score": float(overall_score),
            "skill_similarity": float(skill_similarity),
            "combined_score": float(combined_score)
        }

# Singleton instance
similarity_checker = SimilarityChecker()