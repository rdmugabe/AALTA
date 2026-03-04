terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket         = "aalta-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "aalta-terraform-locks"
  }
}

module "aalta" {
  source = "../../"

  environment = "production"
  aws_region  = "us-west-2"
  domain_name = "aalta.org"
}
