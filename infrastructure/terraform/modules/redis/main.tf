variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

# Security Group
resource "aws_security_group" "redis" {
  name        = "aalta-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "aalta-${var.environment}-redis-sg"
  }
}

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "aalta-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "aalta-${var.environment}-redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }
}

# Redis Cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "aalta-${var.environment}"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = aws_elasticache_parameter_group.main.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  port                 = 6379

  snapshot_retention_limit = var.environment == "production" ? 7 : 0

  tags = {
    Name = "aalta-${var.environment}-redis"
  }
}

# Outputs
output "endpoint" {
  value = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "port" {
  value = aws_elasticache_cluster.main.port
}

output "cluster_id" {
  value = aws_elasticache_cluster.main.id
}

output "connection_string" {
  value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.port}"
}

output "security_group_id" {
  value = aws_security_group.redis.id
}
