package auth

type Identity struct {
	ID   string
	Slug string
}

type Directory interface {
	Lookup(apiKey string) (Identity, bool)
}

type staticDirectory struct {
	tenants map[string]Identity
}

func NewStaticTenantDirectory() Directory {
	return staticDirectory{
		tenants: map[string]Identity{
			"test-key-acme": {ID: "tenant_acme", Slug: "acme"},
			"test-key-beta": {ID: "tenant_beta", Slug: "beta"},
		},
	}
}

func (directory staticDirectory) Lookup(apiKey string) (Identity, bool) {
	tenant, ok := directory.tenants[apiKey]
	return tenant, ok
}
