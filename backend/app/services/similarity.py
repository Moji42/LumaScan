from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from app.services.gemini import extract_skills


class SimilarityChecker:
    def __init__(self):
        self.skill_separators = re.compile(r'[,;/\|]')

    def preprocess_skills(self, text):
        skills = [s.strip().lower() for s in self.skill_separators.split(text) if s.strip()]
        return list(set(skills))

    def _tfidf_similarity(self, text_a: str, text_b: str) -> float:
        if not text_a.strip() or not text_b.strip():
            return 0.0
        vec = TfidfVectorizer().fit_transform([text_a, text_b])
        return float(cosine_similarity(vec[0], vec[1])[0][0])

    def calculate_similarity(self, resume_text: str, job_desc: str) -> dict:
        overall_score = self._tfidf_similarity(resume_text, job_desc)

        resume_skills = self.preprocess_skills(', '.join(extract_skills(resume_text)))
        job_skills = self.preprocess_skills(', '.join(extract_skills(job_desc)))

        if not resume_skills or not job_skills:
            skill_similarity = 0.0
        else:
            skill_similarity = self._tfidf_similarity(
                ' '.join(resume_skills), ' '.join(job_skills)
            )

        combined_score = (0.6 * skill_similarity) + (0.4 * overall_score)

        return {
            "overall_score": overall_score,
            "skill_similarity": skill_similarity,
            "combined_score": combined_score,
        }


similarity_checker = SimilarityChecker()
