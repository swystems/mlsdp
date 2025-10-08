package com.example.hive.udf;

import org.apache.hadoop.hive.ql.exec.UDF;
import java.util.Random;

public class NoiseUDF extends UDF {
    private static final double SENSITIVITY = 500.0;
    private static final Random random = new Random();

    /**
     * Adds Laplace noise to the given value.
     *
     * @param value the input value (e.g., the computed weighted average)
     * @param epsilonStr a string representing the privacy parameter 'e2'
     * @return the value plus Laplace noise
     */
    public Double evaluate(Double value, String epsilonStr) {
        double epsilon;
        try {
            // Try to convert the epsilon parameter to a double.
            epsilon = Double.parseDouble(epsilonStr);
        } catch (NumberFormatException e) {
            // If parsing fails, default to epsilon = 1.0.
            epsilon = 1.0;
        }
        // Generate Laplace noise using inverse transform sampling.
        double u = random.nextDouble() - 0.5;
	if (u < 0.5)
		return value + (epsilon * SENSITIVITY) * Math.log(2 * u);
        return value - (epsilon * SENSITIVITY) * Math.log(2 * (1 - u));
    }
}

