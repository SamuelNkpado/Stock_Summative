# stocktrade_api_summative
Stock Dashboard – Dockerized Deployment
A simple stock dashboard app built with HTML, CSS, and JavaScript, bundled using Vite, and containerized with Docker. The app is served with Nginx, and HAProxy is used for load balancing across multiple instances.

 Tech Stack
Frontend: HTML, CSS, JavaScript


Build Tool: Vite


Containerization: Docker


Web Server: Nginx


Load Balancer: HAProxy



 Project Structure

.
├── dist/                   # Vite build output (auto-generated)
├── node_modules/           # Node dependencies
├── .gitignore              # Ignored files for git
├── Dockerfile              # Multi-stage Dockerfile for building and serving
├── README.md               # This documentation file
├── haproxy.cfg             # HAProxy config for load balancing
├── index.html              # Main HTML page
├── nginx.conf              # Nginx server config
├── package.json            # Project metadata and scripts
├── package-lock.json       # Locked versions of dependencies
├── script.js               # JavaScript logic for the dashboard
├── style.css               # Styling for the dashboard
├── vite.config.mjs         # Vite configuration


 Getting Started
1. Clone the Repository
bash
git clone https://github.com/yourusername/stock-dashboard.git
cd stock-dashboard


 Building the App
2. Install Dependencies
bash

npm install

3. Build with Vite
bash

npm run build

This generates the dist/ folder that contains the production-ready files.

 Docker Setup
4. Dockerfile (Multi-Stage)

Dockerfile

# Stage 1: Build the Vite app
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]


5. Build Docker Image
bash

docker build -t samuelchima/stock-dashbord:v1 .


 Push to Docker Hub
bash

docker login
docker push samuelchima/stock-dashbord:v1


 Networking & Load Balancing
6. Create Docker Network

CopyEdit
docker network create intranet-net

7. Run Two Instances of the App
bash

docker run -d --name web-01-app --network stockDash -p 8081:8080 --env-file .env samuelchima/stock-dashbord:v1
docker run -d --name web-02-app --network stockDash -p 8082:8080 --env-file .env samuelchima/stock-dashbord:v1


8. HAProxy Configuration (haproxy.cfg)
h
CopyEdit
global
    daemon
    maxconn 256

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    server web1 web-01-app:8080 check
    server web2 web-02-app:8080 check
    http-response set-header X-Backend %s

9. Run HAProxy Load Balancer
bash

docker run -d --name lb-01 --network stockDash -p 80:80 \
  -v "$(pwd)/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro" \
  haproxy:latest


✅ Test the App
Access the Load Balanced App
Open in browser:
arduino

http://localhost

Or check the backend via cURL:
bash

curl -v http://localhost | grep -o "X-Backend:.*"


Challenges I had and Clean Up
Bash
I encountered an issue in the first build connect them to web 01 and web 02, which i had to remove them and rebuild again because the network where not properly connected

Second challenge was being able to effective see how the load balancer worked i was able to resolve it by reviewing hyproxy config file and updated them

Last challenge was a git challenge which unfortunately i did not know my token was expired i was able to resolve by creating a new token as well as rebasing my push

Code to resolve some of the isssues
docker stop web-01-app web-02-app lb-01
docker rm web-01-app web-02-app lb-01
docker network rm stockDash
docker rmi samuelchima/stock-dashbord:v1


 Pull from Docker Hub (Optional)
bash

docker pull samuelchima/stock-dashbord:v1
docker run -p 8083:8080 samuelchima/stock-dashbord:v1


