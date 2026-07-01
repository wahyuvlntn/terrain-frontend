FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
ARG VITE_ORG=local
ARG VITE_PRJ=digital_twin_afdd
ARG VITE_MQTT_USERNAME=afdd_ui
ARG VITE_MQTT_PASSWORD=indie123
ARG VITE_MQTT_NOTIFICATION_TOPIC=AFDD_NOTIFICATION
# mqtt (the backend's broker, local) | poll (no broker: the cloud deployment)
ARG VITE_NOTIFY_MODE=mqtt
ENV VITE_ORG=$VITE_ORG VITE_PRJ=$VITE_PRJ \
    VITE_API_URL= VITE_MQTT_URL=/mqtt \
    VITE_MQTT_USERNAME=$VITE_MQTT_USERNAME VITE_MQTT_PASSWORD=$VITE_MQTT_PASSWORD \
    VITE_MQTT_NOTIFICATION_TOPIC=$VITE_MQTT_NOTIFICATION_TOPIC \
    VITE_NOTIFY_MODE=$VITE_NOTIFY_MODE \
    NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

FROM nginx:stable-alpine
LABEL org.opencontainers.image.title="Digital Twin AFDD"
ENV BACKEND_UPSTREAM=https://host.docker.internal:4500 \
    MQTT_UPSTREAM=https://host.docker.internal:9002
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
