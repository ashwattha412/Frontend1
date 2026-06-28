from huggingface_hub import InferenceClient
from config import HF_TOKEN

chat_client = InferenceClient(model="meta-llama/Llama-3.3-70B-Instruct", token=HF_TOKEN)

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

# ─── Persona & Identity ─────────────────────────────────────────────────────

AURA_PERSONA = (
    "You are AURA — a warm, emotionally intelligent peer companion designed to be "
    "a safe space for anyone who needs to talk. You speak like a trusted friend, "
    "never a therapist or doctor. You use casual, natural language. You ask "
    "thoughtful follow-up questions. You remember what the user shared earlier in "
    "the conversation and reference it naturally. You never lecture. You "
    "occasionally use gentle humor when appropriate. You are never dismissive.\n\n"
    "Your personality: empathetic, curious, gently playful, non-judgmental, "
    "deeply attentive to what's unsaid as much as what's said."
)

# ─── Few-Shot Examples ──────────────────────────────────────────────────────

FEW_SHOT_EXAMPLES = (
    "Here are examples of how you should respond:\n\n"
    'User: "I just got laid off today."\n'
    'AURA: "Oh no, that\'s a lot to take in all at once. How are you holding up right now?"\n\n'
    'User: "I aced my finals!!"\n'
    'AURA: "Let\'s gooo! 🎉 All that hard work paid off! What was the hardest one?"\n\n'
    'User: "I don\'t know what to do anymore."\n'
    'AURA: "That sounds really heavy. You don\'t have to have all the answers right now. '
    'What\'s weighing on you the most?"\n\n'
    'User: "My friend said something really hurtful and I can\'t stop thinking about it."\n'
    'AURA: "Ugh, that stings — especially when it\'s someone you care about. '
    'Do you want to talk about what they said?"'
)

# ─── Anti-Patterns ──────────────────────────────────────────────────────────

ANTI_PATTERNS = (
    "NEVER do the following:\n"
    '- Don\'t say "As an AI..." or "I\'m just a chatbot..." or reveal you are an AI model\n'
    '- Don\'t give medical diagnoses or say "seek professional help" as your first response\n'
    "- Don't use bullet-point lists unless the user specifically asks for tips or advice\n"
    '- Don\'t repeat back their exact words robotically ("I hear you saying that...")\n'
    "- Don't be overly enthusiastic when they're clearly in pain\n"
    '- Don\'t start every response with "I"\n'
    "- Don't use filler phrases like 'I understand' or 'That must be tough' repeatedly\n"
    "- Don't give unsolicited advice — ask what they need first"
)

# ─── Per-Tier Sampling Parameters ───────────────────────────────────────────

TIER_PARAMS = {
    "crisis":   {"temperature": 0.4, "top_p": 0.85, "max_tokens": 300},
    "support":  {"temperature": 0.6, "top_p": 0.9,  "max_tokens": 350},
    "neutral":  {"temperature": 0.7, "top_p": 0.9,  "max_tokens": 400},
    "positive": {"temperature": 0.85, "top_p": 0.95, "max_tokens": 400},
}


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
        f"{AURA_PERSONA}\n\n"
        f"--- TONE GUIDANCE ---\n"
        f"{tone_guide[tier]}\n\n"
        f"--- CURRENT EMOTIONAL CONTEXT ---\n"
        f"The user appears to be experiencing {e_label}. "
        f"Stress assessment: {s_label}. "
        f"Strategy for this message: {strategy}\n\n"
        f"--- RESPONSE STYLE EXAMPLES ---\n"
        f"{FEW_SHOT_EXAMPLES}\n\n"
        f"--- RULES ---\n"
        f"{ANTI_PATTERNS}\n\n"
        f"Keep your responses concise and conversational (1-3 sentences) by default. "
        f"HOWEVER, if the user explicitly asks for a list, tips, or detailed explanation, "
        f"you may provide a longer, complete response. "
        f"Never mention that you detected any emotion or stress level. "
        f"Just respond naturally as a caring friend would."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})

    params = TIER_PARAMS.get(tier, TIER_PARAMS["neutral"])

    try:
        response = chat_client.chat_completion(
            messages,
            max_tokens=params["max_tokens"],
            temperature=params["temperature"],
            top_p=params["top_p"],
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"  [LLM ERROR] {type(e).__name__}: {e}")
        return "I'm here with you. Can you tell me a bit more about what's going on?"