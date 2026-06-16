@echo off
setlocal
cd /d "%~dp0.."

if exist .env (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" set "%%a=%%b"
  )
)

if not defined GOOGLE_API_KEY if not defined ANTHROPIC_API_KEY if not defined OPENAI_API_KEY if not defined CURSOR_API_KEY (
  echo Note: No LLM API keys in env — Browse/MCP work; party generation needs keys in .env
)

npm run wiki:dev
