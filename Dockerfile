FROM anothertest/jakt:latest

COPY . /app
WORKDIR /app

RUN mkdir -p /app/build

RUN jakt -O -o velvet main.jakt

CMD ["python", "runit.py"]