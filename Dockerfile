FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

# Copy frontend static files (PWA: manifest, sw.js, icons)
COPY backend/static/ ./static/
# Los HTML canonicos son los de la raiz: pisan las copias de backend/static
COPY backoffice.html ./static/
COPY qr.html ./static/
# La imagen de prod NO incluye el bloque DEV quick-login
RUN sed -i '/DEV-ONLY-START/,/DEV-ONLY-END/d' ./static/backoffice.html ./static/qr.html

EXPOSE 8080
CMD ["./server"]
