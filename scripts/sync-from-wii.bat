@echo off
set SOURCE=C:\Users\dongj\OneDrive\Desktop\wii
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"
python ingest_pdfs.py "%SOURCE%"
echo.
echo Synced: %SOURCE% -^> llm-wiki\raw + wiki\sources + raw\assets
