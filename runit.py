import subprocess
from dataclasses import dataclass
from time import time
from tqdm import tqdm
import argparse

REPEATS = 500
CXX_COMPILER = "clang++"
VELVET_COMPILER = "build/velvet"

def compile(name, noisy=True, rerun=True):
    global CXX_COMPILER, VELVET_COMPILER

    with open("out.cpp", "w") as f:
        result = subprocess.run([VELVET_COMPILER, name], stdout=f, stderr=subprocess.DEVNULL)
        result.check_returncode()
    noise = []
    if not noisy:
        noise = ["-DNO_NOISE"]
    if rerun:
        result = subprocess.run([CXX_COMPILER, "-std=c++23", "-o", "out", *noise, "out.cpp"],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        result.check_returncode()

@dataclass
class RunResult:
    outputs: list[int]
    expected: int
    run_times: list[float]
    compile_run_times: list[float]

def run(name):
    global REPEATS

    compile(name, noisy=False)
    start = time()
    compile(name, noisy=False, rerun=True)
    subprocess.run(["./out"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    end = time()
    print("Compilation time:", end - start, "seconds")
    expected = to_int8(subprocess.run(["./out"]).returncode)
    outputs = []
    run_times = []
    compile_run_times = []
    compile(name, rerun=True)
    for _ in tqdm(range(REPEATS)):
        start_cr = time()
        compile(name, rerun=True)
        end_cr = time()
        compile_run_times.append(end_cr - start_cr)
        result = subprocess.run(["./out"])
        end = time()
        outputs.append(to_int8(result.returncode))
        run_times.append(end - end_cr)
    return RunResult(outputs, expected, run_times, compile_run_times)

def to_int8(x):
    return x
    ## Wrap x into the range -128 to 127 (two's complement conversion)
    #return (x + 128) % 256 - 128

def main():
    global REPEATS, CXX_COMPILER, VELVET_COMPILER

    parser = argparse.ArgumentParser()
    parser.add_argument("--repeats", type=int, default=REPEATS)
    parser.add_argument("--cxx-compiler", type=str, default=CXX_COMPILER)
    parser.add_argument("--velvet-compiler", type=str, default=VELVET_COMPILER)
    args = parser.parse_args()

    REPEATS = args.repeats
    CXX_COMPILER = args.cxx_compiler
    VELVET_COMPILER = args.velvet_compiler

    for name in ["examples/noisymax.velvet"]:
        results = run(name)
        print("===", "Results for", name, "===")
        print("Expected:", results.expected)
        print("Outputs:")
        print(" - Average:", sum(results.outputs) / len(results.outputs))
        print(" - Min:", min(results.outputs))
        print(" - Max:", max(results.outputs))

        print("Accuracy:", sum([1 - (abs(x - results.expected) / results.expected) for x in results.outputs]) / len(results.outputs))

        print("Compile times:")
        print(" - Average:", sum(results.compile_run_times) / len(results.compile_run_times), "seconds")
        print(" - Min:", min(results.compile_run_times))
        print(" - Max:", max(results.compile_run_times))

        print("Run times:")
        print(" - Average:", sum(results.run_times) / len(results.run_times), "seconds")
        print(" - Min:", min(results.run_times))
        print(" - Max:", max(results.run_times))

if __name__ == "__main__":
    main()
