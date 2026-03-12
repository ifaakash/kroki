from datetime import date

import boto3


def generate_aws_report():

    cost_client = boto3.client("ce")
    auth_client = boto3.client("sts")
    try:
        account_id = auth_client.get_caller_identity()["Account"]
        print(f"AWS Management Account ID: {account_id}\n")
    except Exception as e:
        print(f"Error fetching Account ID: {e}")
        return

    # Define the time period (Start of the current month to today)
    today = date.today()
    start_date = today.replace(day=1).strftime("%Y-%m-%d")
    end_date = today.strftime("%Y-%m-%d")

    # Cost Explorer requires a minimum of 1 day range.
    if start_date == end_date:
        print(
            "Today is the 1st of the month. Try running this tomorrow for accurate current-month data."
        )
        return

    print(f"--- Estimated Spend & Services Used ({start_date} to {end_date}) ---\n")

    # Call Cost Explorer API
    try:
        response = cost_client.get_cost_and_usage(
            TimePeriod={"Start": start_date, "End": end_date},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
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

            # Map regions to your environments for easier reading
            env_label = (
                "Prod (us-east-2)"
                if region == "us-east-2"
                else "Dev (us-east-1)"
                if region == "us-east-1"
                else region
            )

            # Filter out services with $0.00 spend to keep the report clean
            if amount > 0:
                print(f"{env_label:<22} | {service:<40} | ${amount:.2f}")

    except Exception as e:
        print(f"Error fetching cost data: {e}")


if __name__ == "__main__":
    generate_aws_report()
