FROM ubuntu:20.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y wget openjdk-8-jdk ssh pdsh netcat && \
    rm -rf /var/lib/apt/lists/*

ENV HIVE_VERSION=3.1.2

RUN mkdir /hive_lib
COPY hive-exec-${HIVE_VERSION}.jar /hive_lib
# RUN wget https://repo1.maven.org/maven2/org/apache/hive/hive-exec/3.1.2/hive-exec-3.1.2.jar /hive_lib/hive-exec-${HIVE_VERSION}.jar

# Copy the UDF source code into the builder image
COPY udf_src /udf_src

# Compile the UDFs and package them into hive_udfs.jar
RUN mkdir -p /build/classes && \
    javac -cp /hive_lib/hive-exec-3.1.2.jar -d /build/classes /udf_src/src/main/java/com/example/hive/udf/*.java && \
    cd /build/classes && jar cvf hive_udfs.jar com



FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y wget openjdk-8-jdk ssh pdsh netcat && \
    rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin
ENV HIVE_VERSION=3.1.2
ENV RANGER_VERSION=2.2.0
eNV HADOOP_VERSION=3.2.4

# Download and install Apache Hive
COPY apache-hive-${HIVE_VERSION}-bin.tar.gz /tmp
# RUN wget https://archive.apache.org/dist/hive/hive-${HIVE_VERSION}/apache-hive-${HIVE_VERSION}-bin.tar.gz /tmp/apache-hive-${HIVE_VERSION}-bin.tar.gz
# RUN cp apache-hive-${HIVE_VERSION}-bin.tar.gz /tmp
RUN tar -zxvf /tmp/apache-hive-${HIVE_VERSION}-bin.tar.gz -C /opt/ && \
    mv /opt/apache-hive-${HIVE_VERSION}-bin /opt/hive && \
    rm /tmp/apache-hive-${HIVE_VERSION}-bin.tar.gz

COPY apache-ranger-${RANGER_VERSION}.tar.gz /tmp
#RUN wget https://downloads.apache.org/ranger/${RANGER_VERSION}/apache-ranger-${RANGER_VERSION}.tar.gz
#RUN cp apache-ranger-${RANGER_VERSION}.tar.gz /tmp
RUN mkdir /opt/ranger && \
    tar -zxvf /tmp/apache-ranger-${RANGER_VERSION}.tar.gz -C /opt/ranger && \
    rm /tmp/apache-ranger-${RANGER_VERSION}.tar.gz

# Set environment variables for Hive
ENV HIVE_HOME=/opt/hive
ENV PATH=$PATH:$HIVE_HOME/bin

COPY hive-exec-${HIVE_VERSION}.jar /tmp
# RUN wget https://repo1.maven.org/maven2/org/apache/hive/hive-exec/${HIVE_VERSION}/hive-exec-${HIVE_VERSION}.jar
# RUN cp hive-exec-${HIVE_VERSION}.jar /tmp

COPY hadoop-${HADOOP_VERSION}.tar.gz /tmp
#RUN wget https://downloads.apache.org/hadoop/core/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz
#RUN cp hadoop-${HADOOP_VERSION}.tar.gz /tmp
RUN tar -zxvf /tmp/hadoop-${HADOOP_VERSION}.tar.gz -C /opt/ && \
    mv /opt/hadoop-${HADOOP_VERSION} /opt/hadoop && \
    rm /tmp/hadoop-${HADOOP_VERSION}.tar.gz

ENV HADOOP_HOME=/opt/hadoop
ENV PATH=$PATH:$HADOOP_HOME/bin

# Create directory for Hive metastore (using Derby)
RUN mkdir -p /opt/hive/metastore_db

# Copy minimal Hive configuration
COPY hive-site.xml $HIVE_HOME/conf/hive-site.xml

COPY --from=builder /build/classes/hive_udfs.jar $HIVE_HOME/lib/hive_udfs.jar

COPY weighted_avg.hql /opt/weighted_avg.hql
COPY weighted_avg-setup.hql /opt/weighted_avg-setup.hql
COPY weighted_avg-base.hql /opt/weighted_avg-base.hql
COPY noisymax.hql /opt/noisymax.hql
COPY noisymax-setup.hql /opt/noisymax-setup.hql
COPY noisymax-base.hql /opt/noisymax-base.hql
COPY vectordot.hql /opt/vectordot.hql
COPY vectordot-setup.hql /opt/vectordot-setup.hql
COPY vectordot-base.hql /opt/vectordot-base.hql
COPY fedprox.hql /opt/fedprox.hql
COPY fedprox-setup.hql /opt/fedprox-setup.hql
COPY fedprox-base.hql /opt/fedprox-base.hql

COPY ranger-policy.json /opt/ranger-policy.json

# Copy startup script that runs the query and starts Ranger Admin
COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN rm $HIVE_HOME/lib/guava*.jar
RUN cp $HADOOP_HOME/share/hadoop/hdfs/lib/guava*.jar $HIVE_HOME/lib

# Expose HiveServer2 port (if needed)
EXPOSE 10000

# Start the container with the startup script
CMD ["/start.sh"]

