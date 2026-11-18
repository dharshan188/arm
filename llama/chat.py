#!/usr/bin/env python3
"""Ask the exported Llama 3.2 1B (.pte, ExecuTorch XNNPACK) one question.

    env -u PYTHONPATH ~/ps2_et/bin/python chat.py "Where should I throw a used battery?"
"""
import argparse, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SYSTEM = ("You are a helpful waste-sorting assistant in India. Answer in 1-2 short sentences. "
          "Bins: GREEN = wet/compost, BLUE = dry/recyclable, RED = domestic hazardous; "
          "e-waste goes to an authorised e-waste collector.")


def llama3_prompt(system, user):
    return ("<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n" + system + "<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n\n" + user + "<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>\n\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("question")
    ap.add_argument("--pte", default=os.path.join(HERE, "llama3_2_1b_qlora_int4_xnnpack.pte"))
    ap.add_argument("--tokenizer", default=os.path.join(HERE, "checkpoint", "tokenizer.model"))
    ap.add_argument("--max-new-tokens", type=int, default=96)
    ap.add_argument("--temperature", type=float, default=0.0)
    a = ap.parse_args()

    # register llama::custom_sdpa / update_cache and quantized kernels with the runtime
    from executorch.extension.llm.custom_ops import custom_ops  # noqa: F401
    import executorch.kernels.quantized  # noqa: F401
    from executorch.extension.llm.runner import TextLLMRunner
    t0 = time.perf_counter()
    runner = TextLLMRunner(a.pte, a.tokenizer)
    load_s = time.perf_counter() - t0

    print(ask(runner, a.question, a.max_new_tokens, a.temperature))
    print(f"[load {load_s:.1f}s]", file=sys.stderr)


def ask(runner, question, max_new_tokens=96, temperature=0.0, system=SYSTEM):
    """Return the model's answer as a clean string (the C++ runner's own stdout/log spam is silenced)."""
    from executorch.extension.llm.runner import GenerationConfig
    cfg = GenerationConfig(echo=False, max_new_tokens=max_new_tokens, temperature=temperature, num_bos=0)
    out = []
    sys.stdout.flush(); sys.stderr.flush()
    saved = os.dup(1), os.dup(2)
    devnull = os.open(os.devnull, os.O_WRONLY)
    os.dup2(devnull, 1); os.dup2(devnull, 2)
    try:
        runner.reset()
        runner.generate(llama3_prompt(system, question), cfg, token_callback=out.append)
    finally:
        os.dup2(saved[0], 1); os.dup2(saved[1], 2)
        for fd in (*saved, devnull):
            os.close(fd)
    return "".join(out).replace("<|eot_id|>", "").strip()


if __name__ == "__main__":
    main()
