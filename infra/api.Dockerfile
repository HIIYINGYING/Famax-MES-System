FROM oven/bun:1.4.2
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run --filter @famax/api build
EXPOSE 4000
CMD ["bun", "run", "--filter", "@famax/api", "start"]
