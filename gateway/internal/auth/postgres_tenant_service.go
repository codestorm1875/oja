package auth

import (
	"context"
	"database/sql"
	"errors"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const lookupTenantByAPIKeyQuery = `
SELECT tenant_id::TEXT, slug
FROM lookup_tenant_by_api_key($1);
`

type PostgresTenantLookupService struct {
	db *sql.DB
}

func NewPostgresTenantLookupService(databaseURL string) (*PostgresTenantLookupService, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return &PostgresTenantLookupService{db: db}, nil
}

func (service *PostgresTenantLookupService) Close() error {
	return service.db.Close()
}

func (service *PostgresTenantLookupService) LookupByAPIKey(ctx context.Context, apiKey string) (Identity, bool, error) {
	var tenant Identity

	err := service.db.QueryRowContext(ctx, lookupTenantByAPIKeyQuery, apiKey).Scan(
		&tenant.ID,
		&tenant.Slug,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Identity{}, false, nil
	}
	if err != nil {
		return Identity{}, false, err
	}

	return tenant, true, nil
}
