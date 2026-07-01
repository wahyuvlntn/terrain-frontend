group "default" {
  targets = ["frontend"]
}

target "frontend" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["digital-twin-afdd-frontend:latest"]
}
