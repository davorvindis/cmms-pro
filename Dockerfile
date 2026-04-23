FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

# Copy frontend static files
RUN mkdir -p static
COPY backoffice.html ./static/
COPY qr.html ./static/

EXPOSE 8080
CMD ["./server"]
