package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvFileSetsMissingValues(t *testing.T) {
	t.Setenv("OJA_EXISTING_KEY", "from-env")

	envPath := filepath.Join(t.TempDir(), ".env")
	contents := []byte(`
# comment
OJA_TEST_KEY=from-file
OJA_EXISTING_KEY=from-file
OJA_QUOTED_KEY="quoted value"
`)

	if err := os.WriteFile(envPath, contents, 0o600); err != nil {
		t.Fatal(err)
	}

	if err := LoadEnvFile(envPath); err != nil {
		t.Fatal(err)
	}

	if got := os.Getenv("OJA_TEST_KEY"); got != "from-file" {
		t.Fatalf("expected OJA_TEST_KEY to be loaded, got %q", got)
	}

	if got := os.Getenv("OJA_EXISTING_KEY"); got != "from-env" {
		t.Fatalf("expected existing env value to win, got %q", got)
	}

	if got := os.Getenv("OJA_QUOTED_KEY"); got != "quoted value" {
		t.Fatalf("expected quotes to be trimmed, got %q", got)
	}
}

func TestLoadEnvFileIgnoresMissingFile(t *testing.T) {
	if err := LoadEnvFile(filepath.Join(t.TempDir(), ".env")); err != nil {
		t.Fatal(err)
	}
}
