from classification_services import detect_emotion, detect_stress
from llm_orchestrator import generate_buddy_response

def chat_pipeline():
    print("\nAURA MVP Pipeline\n")
    print("Type 'exit' to quit.\n")

    conversation_history = []  # ← persistent across turns

    while True:
        user_input = input("You: ")
        if user_input.lower() in ['exit', 'quit']:
            break
        if not user_input.strip():
            continue

        e_data = detect_emotion(user_input)
        s_data = detect_stress(user_input)
        print(f"  [Emotion={e_data['emotion']} | Stress={s_data['stress_level']}]")

        reply = generate_buddy_response(
            user_input,
            e_data['emotion'],
            s_data['stress_level'],
            conversation_history   # ← pass history
        )

        # Append this turn to history AFTER generating the response
        conversation_history.append({"role": "user", "content": user_input})
        conversation_history.append({"role": "assistant", "content": reply})

        # Optional: cap history to last 10 turns to avoid token overflow
        if len(conversation_history) > 20:
            conversation_history = conversation_history[-20:]

        print(f"AURA: {reply}\n")

if __name__ == "__main__":
    chat_pipeline()