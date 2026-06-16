@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
python ingest_raw.py --watch --interval 30 %*
