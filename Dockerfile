FROM anothertest/jakt:latest

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && apt-get install -y python3-pip
RUN python3 -m pip install --break-system-packages tqdm

COPY . /app
WORKDIR /app

RUN mkdir -p /app/build

RUN jakt -O -o velvet main.jakt

ENTRYPOINT ["python3", "runit.py"]
