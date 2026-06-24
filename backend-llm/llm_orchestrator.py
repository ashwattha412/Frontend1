from huggingface_hub import InferenceClient
from config import HF_TOKEN

chat_client = InferenceClient(model="meta-llama/Meta-Llama-3-8B-Instruct", token=HF_TOKEN)

# Emotional strategy map — covers all 28 GoEmotions categories
EMOTION_STRATEGIES = {
    # HIGH DISTRESS — de-escalate, ground, validate
    "grief":        ("crisis", "Acknowledge their loss with deep empathy. Don't rush to solutions. Say something like 'that sounds incredibly hard'."),
    "fear":         ("crisis", "Name their fear without judgment. Offer grounding: focus on breath or what they can see/touch right now."),
    "anger":        ("crisis", "Validate the anger first — 'it makes sense you feel that way'. Don't argue. Redirect gently."),
    "nervousness":  ("crisis", "Normalize anxiety. Help them slow down: what's one small thing they can control right now?"),
    "remorse":      ("crisis", "Reassure them that feeling bad means they care. Avoid piling on guilt."),
    "embarrassment":("crisis", "Normalize the feeling. Remind them everyone has moments like this."),
    "disappointment":("support","Acknowledge the gap between expectation and reality. Be gentle, not dismissive."),
    "sadness":      ("support","Sit with their sadness. Don't immediately try to fix it. Ask what they need most right now."),
    "disgust":      ("support","Validate that some things genuinely feel wrong or uncomfortable. Don't dismiss the feeling."),

    # NEUTRAL/MILD — be present, gently uplift
    "neutral":      ("neutral", "Be curious and engaged. Ask an open-ended question to help them open up."),
    "realization":  ("neutral", "Reflect the insight back to them. Help them explore what it means."),
    "surprise":     ("neutral", "Match their energy — surprised or curious. Ask what happened."),
    "confusion":    ("neutral", "Be patient and clear. Help them break down what's confusing them into smaller pieces."),
    "curiosity":    ("neutral", "Lean into their curiosity. Be engaging and share in their interest."),

    # POSITIVE — amplify, celebrate, sustain
    "joy":          ("positive","Match their joy! Celebrate with them. Ask what's making them feel this way."),
    "optimism":     ("positive","Reinforce their positive outlook. Help them channel it into something concrete."),
    "pride":        ("positive","Celebrate their achievement genuinely. Ask what made it happen."),
    "relief":       ("positive","Acknowledge the weight that's been lifted. Ask what's next for them."),
    "love":         ("positive","Warmly acknowledge their feelings. Celebrate the connection they feel."),
    "gratitude":    ("positive","Reflect gratitude back. This is a beautiful moment — build on it."),
    "admiration":   ("positive","Affirm their appreciation. Ask what inspires them about it."),
    "amusement":    ("positive","Be playful and match their humor. Keep things light and fun."),
    "excitement":   ("positive","Feed the excitement! Ask what they're looking forward to most."),
    "approval":     ("positive","Acknowledge and affirm. Validate their positive judgment."),
    "desire":       ("positive","Explore their aspirations. Ask what they're hoping for."),
    "caring":       ("positive","Acknowledge their compassion. Ask how you can support them in turn."),
}

def get_strategy(e_label: str, s_label: str):
    """Returns (mood_tier, strategy_text) for a given emotion/stress combo."""
    tier, strategy = EMOTION_STRATEGIES.get(e_label, ("neutral", "Be a warm, present listener."))
    
    # Stress overrides tier upward in severity
    if s_label == "Suicidal":
        tier = "crisis"
        strategy = "They are expressing severe distress or suicidal ideation. You must be extremely gentle, validating, and prioritize emotional safety. Gently encourage seeking professional help without sounding clinical."
    elif s_label in ["Anxiety", "Depression"]:
        if tier == "neutral":
            tier = "support"
            strategy = f"They seem neutral, but underlying {s_label.lower()} is detected. Gently ask what's weighing on them without prying."
        elif tier == "positive":
            tier = "neutral"
            strategy = f"They seem upbeat but underlying {s_label.lower()} is present. Gently check in on how they are really feeling."
    
    return tier, strategy

def generate_buddy_response(
    user_message: str,
    e_label: str,
    s_label: str,
    conversation_history: list
) -> str:
    tier, strategy = get_strategy(e_label, s_label)

    tone_guide = {
        "crisis":   "You are calm, warm, and non-judgmental. Never minimize. Never rush. Prioritize emotional safety.",
        "support":  "You are gentle and present. Acknowledge before advising. Ask what they need.",
        "neutral":  "You are curious and friendly. Keep the conversation flowing naturally.",
        "positive": "You are energetic and celebratory. Match their vibe. Keep the momentum going.",
    }

    system_prompt = (
        f"You are AURA, a warm, emotionally intelligent peer companion. "
        f"The user's detected emotion is '{e_label}' and stress level is '{s_label}'. "
        f"Tone: {tone_guide[tier]} "
        f"Strategy for this message: {strategy} "
        f"Rules: Keep your responses concise and conversational (1-3 sentences) by default. HOWEVER, if the user explicitly asks for a list, tips, or detailed explanation, you may provide a longer, complete response. Never give medical or clinical advice. "
        f"Never say 'I detect' or mention the emotion detection. Just respond naturally."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})

    try:
        response = chat_client.chat_completion(messages, max_tokens=400, temperature=0.7)
        return response.choices[0].message.content
    except Exception:
        return "I'm here with you. Can you tell me a bit more about what's going on?"