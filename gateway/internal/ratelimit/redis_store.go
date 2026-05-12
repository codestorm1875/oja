package ratelimit

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(client *redis.Client) *RedisStore {
	return &RedisStore{client: client}
}

func (store *RedisStore) Increment(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	count, err := store.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	if count == 1 {
		if err := store.client.Expire(ctx, key, ttl).Err(); err != nil {
			return 0, err
		}
	}

	return count, nil
}
