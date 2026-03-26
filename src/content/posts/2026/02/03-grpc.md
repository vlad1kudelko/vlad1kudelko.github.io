---
title: "gRPC и Protocol Buffers"
description: "gRPC: высокопроизводительный RPC с Protocol Buffers"
heroImage: "../../../../assets/imgs/2026/02/03-grpc.webp"
pubDate: "2026-02-03"
---

gRPC — быстрый и эффективный RPC фреймворк.

```protobuf
// user.proto
syntax = "proto3";

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

service UserService {
  rpc GetUser (UserRequest) returns (User);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
}
```