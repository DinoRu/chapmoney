# Supprimer les blocs upstream - ils seront déplacés

server {
    listen 80;
    server_name management.chapdemo.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name management.chapdemo.ru;

    ssl_certificate /etc/nginx/certs/management.chapdemo.ru.crt;
    ssl_certificate_key /etc/nginx/certs/management.chapdemo.ru.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # RabbitMQ Proxy
    location /rabbitmq/ {
        auth_basic "RabbitMQ Management";
        auth_basic_user_file /etc/nginx/auth/rabbitmq.passwd;
        
        # Utiliser directement le service Docker
        proxy_pass http://rabbitmq:15672/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Flower Proxy
    location /flower/ {
        auth_basic "Flower Monitoring";
        auth_basic_user_file /etc/nginx/auth/flower.passwd;
        
        # Utiliser directement le service Docker
        proxy_pass http://flower:5555/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = / {
        return 403;
    }

    location / {
        deny all;
        return 404;
    }
    
    # Acme Challenge pour Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }
}