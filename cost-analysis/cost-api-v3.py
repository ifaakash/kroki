import argparse
from datetime import date

import boto3


def generate_aws_report(environment):
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

    # Fetch today's date to set reference for previous month's start and end dates
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

    if start_date == end_date:
        print(
            "Today is the 1st of the month. Try running this tomorrow for accurate current-month data."
        )
        return

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

        for group in results:
            region = group["Keys"][0]
            service = group["Keys"][1]
            amount = float(group["Metrics"]["UnblendedCost"]["Amount"])

            # Label the regions clearly
            env_label = (
                "Prod (us-east-2)" if region == "us-east-2" else "Dev (us-east-1)"
            )

            # Filter out $0.00 spend
            if amount > 0:
                print(f"{env_label:<22} | {service:<40} | ${amount:.2f}")

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

    args = parser.parse_args()
    generate_aws_report(args.env)
