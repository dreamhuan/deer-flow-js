# DeerFlow with Typescript

注意：本项目仅是一个学习项目，作为[deer-flow](https://github.com/bytedance/deer-flow)的学习+复刻，没有实现全部功能，如需使用请直接使用原项目。

## install

```
cp .env.sample .env
yarn
```

去[硅基流动](https://cloud.siliconflow.cn/me/account/ak)和[tavily](https://app.tavily.com/home)注册个key并写入.env

另外，有些问答太费token了，可以白嫖[阿里百炼](https://bailian.console.aliyun.com/?tab=model#/api-key)的免费额度（每个模型100w token）记得一定要开启“免费额度用完即停”功能

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
