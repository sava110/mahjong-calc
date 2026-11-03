# web 版の配信は終了した。対局ルーム API（server/、mahjong-calc-api）への中継と、終了のお知らせだけを配信する。
FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/site/ /usr/share/nginx/html/
