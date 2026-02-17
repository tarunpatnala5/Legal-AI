# Legal AI Project

This project is a full-stack legal AI application built with a Python backend (FastAPI) and a Next.js frontend.

## Prerequisites

- **Python** (3.8 or higher)
- **Node.js** (18 or higher) and **npm**

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/tarunpatnala5/Legal-AI.git
cd Legal-AI
```

### 2. Backend Setup

1.  **Create a Virtual Environment (Recommended)**
    ```bash
    python -m venv venv
    # Activate on Windows:
    .\venv\Scripts\activate
    # Activate on Mac/Linux:
    source venv/bin/activate
    ```

2.  **Install Dependencies**
    ```bash
    pip install -r backend/requirements.txt
    ```

3.  **Initialize Database (If needed)**
    If `legal_ai.db` does not exist or needs to be reset:
    ```bash
    python backend/init_db.py
    ```

4.  **Run the Backend Server**
    From the root directory:
    ```bash
    python run_backend.py
    ```
    The backend will start at `http://localhost:8000`.

### 3. Frontend Setup

1.  **Navigate to the Frontend Directory**
    Open a *new* terminal window and run:
    ```bash
    cd frontend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run the Frontend Development Server**
    ```bash
    npm run dev
    ```
    The frontend will start at `http://localhost:3000`.

## Features

- **Legal Document Analysis**: Upload and analyze legal documents.
- **Case Search**: Search through relevant case laws.
- **AI Chat**: Interact with an AI assistant for legal queries.

## Project Structure

- `backend/`: FastAPI backend application.
- `frontend/`: Next.js frontend application.
- `run_backend.py`: Script to launch the backend server.
