from huggingface_hub import InferenceClient
from transformers import pipeline
from config import HF_TOKEN

# Emotion model via Hugging Face Inference API
emotion_client = InferenceClient(
    model="SamLowe/roberta-base-go_emotions",
    token=HF_TOKEN
)

# Stress / mental-health classifier loaded locally to avoid provider routing issues
# Pick one of these models:
#   - "ourafla/mental-health-bert-finetuned"
#   - "dsuram/distilbert-mentalhealth-classifier"
STRESS_MODEL = "ourafla/mental-health-bert-finetuned"

stress_classifier = pipeline(
    task="text-classification",
    model=STRESS_MODEL,
    tokenizer=STRESS_MODEL,
    truncation=True
)

def detect_emotion(text: str) -> dict:
    """Evaluates text against GoEmotions categories."""
    try:
        results = emotion_client.text_classification(text)

        # InferenceClient may return objects with attributes or dict-like items,
        # so handle both safely.
        top = results[0]
        label = top["label"] if isinstance(top, dict) else top.label
        score = top["score"] if isinstance(top, dict) else top.score

        return {"emotion": label, "emotion_score": float(score)}
    except Exception:
        return {"emotion": "neutral", "emotion_score": 0.0}

STRESS_LABELS = {
    "LABEL_0": "Anxiety",
    "LABEL_1": "Depression",
    "LABEL_2": "Normal",
    "LABEL_3": "Suicidal",
}

def detect_stress(text: str) -> dict:
    """Evaluates text for mental distress indicators using a fine-tuned classifier."""
    try:
        results = stress_classifier(text)
        top = results[0]
        raw_label = top["label"]
        label = STRESS_LABELS.get(raw_label, raw_label)
        return {"stress_level": label, "stress_score": float(top["score"])}
    except Exception:
        return {"stress_level": "unknown", "stress_score": 0.0}
