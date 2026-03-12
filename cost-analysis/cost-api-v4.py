import argparse
from datetime import date

import boto3


def generate_aws_report(environment, current_month):
    # Initialize Boto3 clients
    sts_client = boto3.client("sts")
    ce_client = boto3.client("ce")

    # Fetch AWS Management Account ID
    try:
        account_id = sts_client.get_caller_identity().get("Account")
        print(f"AWS Management Account ID: {account_id}\n")
    except Exception as e:
        print(f"Error fetching Account ID: {e}")
        return

    # Map environments to your specific regions
    env_map = {
        "dev": ["us-east-1"],
        "prod": ["us-east-2"],
        "both": ["us-east-1", "us-east-2"],
    }

    target_regions = env_map.get(environment.lower())

    if not target_regions:
        print("Invalid environment. Please choose 'dev', 'prod', or 'both'.")
        return

    if current_month == "false":
        # Define the time period for the PREVIOUS month
        today = date.today()

        # The End date is exclusive in Cost Explorer, so we use the 1st of the current month
        end_date_obj = today.replace(day=1)
        end_date = end_date_obj.strftime("%Y-%m-%d")

        # Calculate the 1st of the previous month (handling the January to December edge case)
        if today.month == 1:
            start_date_obj = date(today.year - 1, 12, 1)
        else:
            start_date_obj = date(today.year, today.month - 1, 1)

        start_date = start_date_obj.strftime("%Y-%m-%d")
    else:
        # Define the time period for the CURRENT month
        today = date.today()
        end_date = today.strftime("%Y-%m-%d")
        start_date = today.replace(day=1).strftime("%Y-%m-%d")

    print(
        f"--- Estimated Spend & Services ({start_date} to {end_date}) | Env: {environment.upper()} ---\n"
    )

    # Call Cost Explorer API with a Region Filter
    try:
        response = ce_client.get_cost_and_usage(
            TimePeriod={"Start": start_date, "End": end_date},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            Filter={"Dimensions": {"Key": "REGION", "Values": target_regions}},
            GroupBy=[
                {"Type": "DIMENSION", "Key": "REGION"},
                {"Type": "DIMENSION", "Key": "SERVICE"},
            ],
        )

        results = response["ResultsByTime"][0]["Groups"]

        # Format the output table
        print(f"{'Environment / Region':<22} | {'AWS Service':<40} | {'Cost (USD)'}")
        print("-" * 80)

        # Initialize running totals
        total_dev_cost = 0.0
        total_prod_cost = 0.0

        for group in results:
            region = group["Keys"][0]
            service = group["Keys"][1]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])

            # Label the regions clearly
            env_label = (
                "Prod (us-east-2)" if region == "us-east-2" else "Dev (us-east-1)"
            )

            # Accumulate the totals based on the region
            if region == "us-east-1":
                total_dev_cost += amount
            elif region == "us-east-2":
                total_prod_cost += amount

            # Filter out $0.00 spend to keep the report clean
            if amount > 0:
                print(f"{env_label:<22} | {service:<40} | ${amount:.2f}")

        # Print the summary totals at the bottom
        print("-" * 80)

        if environment.lower() == "dev":
            print(f"{'Total Dev (us-east-1) Cost:':<65} | ${total_dev_cost:.2f}")
        elif environment.lower() == "prod":
            print(f"{'Total Prod (us-east-2) Cost:':<65} | ${total_prod_cost:.2f}")
        elif environment.lower() == "both":
            print(f"{'Total Dev (us-east-1) Cost:':<65} | ${total_dev_cost:.2f}")
            print(f"{'Total Prod (us-east-2) Cost:':<65} | ${total_prod_cost:.2f}")
            print("=" * 80)
            print(f"{'Grand Total:':<65} | ${(total_dev_cost + total_prod_cost):.2f}")

    except Exception as e:
        print(f"Error fetching cost data: {e}")


if __name__ == "__main__":
    # Set up argument parsing for the command line
    parser = argparse.ArgumentParser(
        description="Fetch AWS Cost and Usage Report by Environment."
    )
    parser.add_argument(
        "--env",
        type=str,
        choices=["dev", "prod", "both"],
        default="both",
        help="Specify the environment to report on: 'dev' (us-east-1), 'prod' (us-east-2), or 'both'.",
    )

    parser.add_argument(
        "--current_month",
        type=str,
        choices=["true", "false"],
        default="false",
        help="Specify if you want the report for current month or not",
    )

    args = parser.parse_args()
    generate_aws_report(args.env, args.current_month)
