FROM gcc:latest
WORKDIR /app
COPY . .
ENTRYPOINT ["bash"]
