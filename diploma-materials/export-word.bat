@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python diploma-materials\shared\html_to_word.py
echo.
echo Готово. Файлы:
echo   diploma-materials\01-server\diploma.docx
echo   diploma-materials\02-web\diploma.docx
echo   diploma-materials\03-docker\diploma.docx
pause
