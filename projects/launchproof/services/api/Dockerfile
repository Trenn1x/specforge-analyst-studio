FROM python:3.12.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

RUN addgroup --system --gid 10001 launchproof \
    && adduser --system --uid 10001 --ingroup launchproof launchproof

COPY requirements.txt ./requirements.txt
RUN python -m pip install --disable-pip-version-check --no-compile -r requirements.txt

COPY --chown=launchproof:launchproof app ./app

USER launchproof
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', '8080') + '/health/live', timeout=2)"

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --no-server-header"]
