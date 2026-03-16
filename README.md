# SurveyAgent

AI-powered conversational survey platform where an AI chatbot conducts interviews with respondents via text, voice, or video avatar.

## Tech Stack

- **Backend**: FastAPI + Motor (async MongoDB) + OpenAI
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Package Manager**: uv (dev) / pip (deployment)

## Project Structure

```
server/
├── main.py              # FastAPI app entry point with CORS, router includes
├── core/
│   ├── config.py        # pydantic-settings (MONGO_URI, OPENAI_API_KEY, JWT_SECRET_KEY, etc.)
│   ├── llm.py           # AsyncOpenAI client singleton
│   └── logging_config.py
├── db/
│   └── mongo.py         # Motor async MongoDB connection + log_error helper
├── auth/
│   ├── routes.py        # register, login, refresh, /me, update-profile
│   ├── schemas.py       # Pydantic schemas (AdminInDB, TokenResponse, AdminProfile, etc.)
│   └── utils.py         # JWT create/verify, get_current_user dependency, password hashing
```

## Setup

### Prerequisites

- Python 3.12+
- MongoDB (Atlas or local)
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

### Development (uv)

```bash
# Clone the repo
git clone https://github.com/aditya699/surveyagent.git
cd surveyagent

# Install dependencies
uv sync

# Copy .env.example to .env and fill in your values
cp .env.example .env

# Run the server
uv run uvicorn server.main:app --reload
```

### Deployment (pip)

```bash
pip install -r requirements.txt
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Root health check |
| GET | `/health` | No | Health status |
| POST | `/api/v1/auth/register` | No | Register new admin |
| POST | `/api/v1/auth/login` | No | Login with email + password |
| POST | `/api/v1/auth/refresh` | No | Refresh JWT tokens |
| GET | `/api/v1/auth/me` | JWT | Get current user profile |
| PUT | `/api/v1/auth/update-profile` | JWT | Update name / org_name |

## License

MIT
