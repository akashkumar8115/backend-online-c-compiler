FROM gcc:latest
WORKDIR /app
RUN npm install
COPY . .
ENTRYPOINT ["bash"]
CMD ["nodemon","index.js"]