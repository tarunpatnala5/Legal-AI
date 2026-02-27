import requests
import os
from datetime import datetime
from config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.TOGETHER_API_KEY or ""
        self.base_url = "https://api.together.xyz/v1/chat/completions"
        self.model = "mistralai/Mixtral-8x7B-Instruct-v0.1" 
        # Using Mixtral-8x7B for 32k context window to handle large legal documents.

    def get_chat_response(self, messages, max_tokens=1024):
        """
        messages: list of dicts [{"role": "user", "content": "..."}]
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Ensure system prompt for legal context if not present
        if messages and messages[0]['role'] != 'system':
            messages.insert(0, {
                "role": "system", 
                "content": f"You are an advanced Legal AI Assistant designed for Indian Law. Current Date: {datetime.now().strftime('%Y-%m-%d')}\n\n**Guidelines:**\n1. **Conversation**: For casual greetings (e.g., 'Hi', 'Hello'), respond naturally and briefly without legal jargon. Do not hallucinate legal scenarios unless asked.\n2. **Legal Knowledge**: When discussing legal matters, you MUST be well-versed with **Bharatiya Nyaya Sanhita (BNS)**, **Bharatiya Nagarik Suraksha Sanhita (BNSS)**, and **Bharatiya Sakshya Adhiniyam (BSA)**. ALWAYS provide references to both these new laws AND the corresponding old IPC/CrPC/IEA sections for clarity.\n3. **Scheduling**: ONLY if the user EXPLICITLY asks to 'schedule', 'add to calendar', or 'remind me' of an event:\n   - Check if the requested date is in the past relative to the Current Date. If it is, DO NOT schedule; instead, ask for a valid future date.\n   - If the date is valid or ambiguous, ask for clarification.\n   - ONLY if strict 'title', 'date' (future), and 'time' are present, output a JSON block at the end of your response in this format:\n```json\n{{\n  \"action\": \"schedule\",\n  \"title\": \"Event Title\",\n  \"date\": \"YYYY-MM-DD\",\n  \"time\": \"HH:MM\"\n}}\n```\nDo NOT output this JSON for general questions, past dates, or if information is missing."
            })

        # Validate and clean messages, merging consecutive messages from the same role
        cleaned_messages = []
        last_role = None
        
        for msg in messages:
            content = msg.get('content', '').strip()
            role = msg['role']
            
            if not content:
                continue
                
            # Truncate extremely long individual messages
            if len(content) > 12000:
                content = content[:12000] + "...[truncated]"
            
            if role == last_role and cleaned_messages:
                # Merge with previous message
                cleaned_messages[-1]['content'] += "\n\n" + content
            else:
                # Append new message
                cleaned_messages.append({"role": role, "content": content})
            
            last_role = role
        
        payload = {
            "model": self.model,
            "messages": cleaned_messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "top_p": 0.7,
            "top_k": 50,
            "repetition_penalty": 1
        }

        try:
            response = requests.post(self.base_url, json=payload, headers=headers)
            
            if response.status_code != 200:
                print(f"AI API Error Status: {response.status_code}")
                print(f"AI API Error Body: {response.text}")
                
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except Exception as e:
            print(f"Error calling Together AI: {e}")
            return "I'm sorry, I'm unable to process your request right now. The AI service may be temporarily unavailable. Please try again in a moment."

    def draft_legal_document(self, topic, details):
        prompt = f"Draft a detailed legal document regarding '{topic}'.\n\nDetails:\n{details}\n\nFormat strictly as a professional {topic} under Indian Law."
        messages = [{"role": "user", "content": prompt}]
        return self.get_chat_response(messages, max_tokens=2048)

ai_service = AIService()
