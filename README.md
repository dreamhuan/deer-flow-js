# DeerFlow with Typescript

注意：本项目仅是一个学习项目，作为[deer-flow](https://github.com/bytedance/deer-flow)的学习+复刻，没有实现全部功能，如需使用请直接使用原项目。

虽然Langgraph本身就会提供节点的图，但还是自己看完代码画了个
![流程图](./graph.png)

## install

```
cp .env.sample .env
yarn
```

去[硅基流动](https://cloud.siliconflow.cn/me/account/ak)和[tavily](https://app.tavily.com/home)注册个key并写入.env

另外，有些问答太费token了，可以白嫖[阿里百炼](https://bailian.console.aliyun.com/?tab=model#/api-key)的免费额度（每个模型100w token）**记得一定要开启“免费额度用完即停”功能**

llm的所有定义在`src/llms`下，去[百炼平台](https://bailian.console.aliyun.com/?tab=model#/model-market/all)搜索需要的模型，以及开启免费额度用完即停

## start

别直接运行！！确保你所有使用的模型均为免费或者已经开了免费额度用完即停或者氪佬随意

```
yarn demo # 跑跑demo调试
```

```
yarn dev # 跑完整链路，但是问题代码写死
```

```
yarn cli # 逻辑同dev但是命令行交互式提问
```

## 创建数据库

### 启动带有 pgvector 的 PostgreSQL 容器

```
docker run -d \
 --name postgres-vector \
 -e POSTGRES_PASSWORD=abc123 \
 -e POSTGRES_DB=postgres \
 -v postgres_data:/var/lib/postgresql \
 -p 5432:5432 \
 ankane/pgvector:latest
```

### 连接到数据库并创建扩展

```
docker exec -it postgres-vector psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 连接url

```
postgresql://postgres:abc123@localhost:5432/postgres?sslmode=disable
```

## 运行出错之后的重试

使用postgres记录了LangGraph的checkpoint，所以具备任意节点重试的能力。

### 出错重试

如果某次运行出错了，记录那次的thread_id，修改`src/graph/workflow.ts`的`RETRY.1`和`RETRY.3`位置代码后重新运行

### 任意节点重试

记录运行的thread_id以及期望重试的checkpoint_id，修改`RETRY.1,2,3`3处代码后重新运行（注意，真正重试的是next节点）   

比如checkpoint_id改为`next: [ 'planner' ]`那一项对应的`1f0a8d90-dfb0-6691-800b-9c1e7e925c0f`，实际上重试的会是下一个节点即`1f0a8d90-dfba-62d0-800c-5666fb356ba6`对应的流程，当然因为是`next: [ 'planner' ]`，所以这个的流程就是`planner`节点。

```
---
checkpoint_id: 1f0a8d99-eafb-6410-800d-c105617b8c66
next: []
---
checkpoint_id: 1f0a8d90-dfba-62d0-800c-5666fb356ba6
next: [ 'reporter' ]
---
checkpoint_id: 1f0a8d90-dfb0-6691-800b-9c1e7e925c0f
next: [ 'planner' ]
---
checkpoint_id: 1f0a8d90-dfa9-6160-800a-d3116c5ead51
next: [ 'research_team' ]
---
checkpoint_id: 1f0a8d76-a1d8-6580-8009-3b68fd8df2f7
next: [ 'researcher' ]
---
checkpoint_id: 1f0a8d76-a1ce-6940-8008-748869ce5c12
next: [ 'research_team' ]
---
checkpoint_id: 1f0a8cb3-132b-66c0-8003-0c8bc2015c4a
next: [ 'human_feedback' ]
---
checkpoint_id: 1f0a8cb2-5ddb-6680-8002-ab70c9d79b5f
next: [ 'planner' ]
---
checkpoint_id: 1f0a8cb2-43d9-6b10-8001-a2279102c485
next: [ 'background_investigator' ]
---
checkpoint_id: 1f0a8cb2-2aae-6d20-8000-6eca7cebcac7
next: [ 'coordinator' ]
---
checkpoint_id: 1f0a8cb2-2aa0-62c0-ffff-fcaacea8bef2
next: [ '__start__' ]
```
