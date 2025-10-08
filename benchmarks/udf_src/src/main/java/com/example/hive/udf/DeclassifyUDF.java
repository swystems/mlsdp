package com.example.hive.udf;

import org.apache.hadoop.hive.ql.exec.UDF;
import java.util.Random;
import java.math.BigInteger;

public class DeclassifyUDF extends UDF {
    private static final double SENSITIVITY = 5.0;
    private static final Random random = new Random();

    /**
     * No-op declassification: returns the input value unchanged.
     *
     * @param value the original secret value (e.g., lab(L3) eps(e0))
     * @param targetLevel the target security level (e.g., "L2")
     * @param epsilon the declassification epsilon (e.g., "e1")
     * @return the same value
     */
    public Integer evaluate(Integer value, String targetLevel, String epsilon) {
        double u = random.nextDouble() - 0.5;
	if (u < 0.5)
		return (int)(value + (SENSITIVITY) * Math.log(2 * u));
        return (int)(value - (SENSITIVITY) * Math.log(2 * (1 - u)));
    }
    public Integer evaluate(BigInteger value, String targetLevel, String epsilon) {
        double u = random.nextDouble() - 0.5;
	if (u < 0.5)
		return (int)(value.intValue() + (SENSITIVITY) * Math.log(2 * u));
        return (int)(value.intValue() - (SENSITIVITY) * Math.log(2 * (1 - u)));
    }
}

