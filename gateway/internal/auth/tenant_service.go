package auth

import (
	"context"
	"encoding/json"
	"os"
)

type TenantLookupService interface {
	LookupByAPIKey(ctx context.Context, apiKey string) (Identity, bool, error)
}

type tenantRecord struct {
	Identity
	APIKey string `json:"apiKey"`
}

type FileTenantLookupService struct {
	tenantsByAPIKey map[string]Identity
}

func NewFileTenantLookupService(path string) (*FileTenantLookupService, error) {
	records := make([]tenantRecord, 0)

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}

	tenantsByAPIKey := make(map[string]Identity, len(records))
	for _, record := range records {
		tenantsByAPIKey[record.APIKey] = record.Identity
	}

	return &FileTenantLookupService{
		tenantsByAPIKey: tenantsByAPIKey,
	}, nil
}

func (service *FileTenantLookupService) LookupByAPIKey(_ context.Context, apiKey string) (Identity, bool, error) {
	tenant, ok := service.tenantsByAPIKey[apiKey]
	return tenant, ok, nil
}
