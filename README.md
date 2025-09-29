# DeerFlow with Typescript

https://github.com/bytedance/deer-flow

## install

```
cp .env.sample .env
yarn
```

去[硅基流动](https://cloud.siliconflow.cn/me/account/ak)和[tavily](https://app.tavily.com/home)注册个token并写入.env

## start

```
yarn dev
```

## 创建数据库

### 启动带有 pgvector 的 PostgreSQL 容器

docker run -d \
 --name postgres-vector \
 -e POSTGRES_PASSWORD=abc123 \
 -e POSTGRES_DB=postgres \
 -v postgres_data:/var/lib/postgresql \
 -p 5432:5432 \
 ankane/pgvector:latest

### 连接到数据库并创建扩展

docker exec -it postgres-vector psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"

### 连接url

postgresql://postgres:abc123@localhost:5432/postgres?sslmode=disable
