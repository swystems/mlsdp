#!/bin/bash
set -e

schematool -initSchema -dbType derby >/dev/null 2>&1

echo "Starting Apache Hive (using embedded metastore)..."
nohub hive --service metastore > /tmp/hivemetastore.log 2>&1 &
sleep 3

echo "Starting Apache Ranger Admin service..."
nohup /opt/ranger/ews/start_ranger_admin.sh > /tmp/ranger.log 2>&1 &
sleep 2

if false; then
	echo "Setting up Hive DB..."
	hive -f /opt/weighted_avg-setup.hql

	echo "Running Base Hive Query..."
	for i in $(seq 1 5); do
		hive -f /opt/weighted_avg-base.hql
	done

	echo "Running DP Hive Query..."
	for i in $(seq 1 100); do
		hive -f /opt/weighted_avg.hql
	done
fi
if false; then
	echo "Setting up Hive DB..."
	hive -f /opt/noisymax-setup.hql

	echo "Running Base Hive Query..."
	for i in $(seq 1 5); do
		hive -f /opt/noisymax-base.hql
	done

	echo "Running DP Hive Query..."
	for i in $(seq 1 100); do
		hive -f /opt/noisymax.hql
	done
fi
if false; then
	echo "Setting up Hive DB..."
	hive -f /opt/vectordot-setup.hql

	echo "Running Base Hive Query..."
	for i in $(seq 1 5); do
		hive -f /opt/vectordot-base.hql
	done

	echo "Running DP Hive Query..."
	for i in $(seq 1 100); do
		hive -f /opt/vectordot.hql
	done
fi
if true; then
	echo "Setting up Hive DB..."
	hive -f /opt/fedprox-setup.hql

	echo "Running Base Hive Query..."
	for i in $(seq 1 5); do
		hive -f /opt/fedprox-base.hql
	done

	echo "Running DP Hive Query..."
	for i in $(seq 1 100); do
		hive -f /opt/fedprox.hql
	done
fi

echo "Done. Will remain running..."
tail -f /dev/null
