# Author: Marla Seras
# Date created: 2020-03-16

# Standard scientific Python imports
import pandas as pd
import numpy as np
import glob as gb
import tinysegmenter as ts
import json
import sys
# import nltk
# import nltk.tokenize.api
# import fasttext

# ft = SourceFileLoader("FastText", r"C:\Users\marla.seras\Documents\FW About Line ReductionDeletion\tools-main\Lib\fasttext\python\fasttext_module\fasttext").load_module()


# Import required libraries
from collections import defaultdict
# from jNlp.jTokenize import jTokenize
from sklearn import preprocessing, svm, naive_bayes
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, ComplementNB, BernoulliNB, CategoricalNB
from sklearn.svm import SVC
from importlib._bootstrap_external import SourceFileLoader

def classify(medicine_input):  
    # Retrieve data from csv files
    path = r'./classifier_types' # use your path
    all_files = gb.glob(path + "/*.csv")
    dataset = pd.concat((pd.read_csv(f, header=None) for f in all_files), sort=True)

    # Data pre-processing
    # JNLP References:
    # https://stackoverflow.com/questions/41707679/it-idf-with-tfidfvectorizer-on-japanese-text
    # https://jprocessing.readthedocs.io/en/latest/
    # dataset0_string = listToString(dataset[0])
    
    # TinySegmenter Reference:
    # https://pypi.org/project/tinysegmenter/
    # class myTinySegmenter(ts.TinySegmenter, nltk.tokenize.api.TokenizerI):
    #     pass
    # segmenter = myTinySegmenter()
    
    segmenter = ts.TinySegmenter()
    # dataset0_string = listToString(dataset[0])
    # list_of_tokens = segmenter.tokenize(dataset0_string)
    # print(list_of_tokens)
    
    # FastText Reference:
    # https://fasttext.cc/docs/en/supervised-tutorial.html
    # print(dataset[0]);   
    # dataset0_string = listToString(dataset[0])
    # list_of_tokens = fasttext.tokenize(dataset0_string)
    # print(list_of_tokens)
    # return

    # Prepare train and test data
    # Reference: https://towardsdatascience.com/multi-class-text-classification-with-scikit-learn-12f1e60e0a9f
    X_train, X_test, y_train, y_test = train_test_split(dataset[0], dataset[1], random_state=0)

    # count_vect = CountVectorizer(ngram_range=(1,1), tokenizer=jTokenize)
    # # count_vect = CountVectorizer()
    # X_train_counts = count_vect.fit_transform(X_train)
    # tfidf_transformer = TfidfTransformer()
    # X_train_tfidf = tfidf_transformer.fit_transform(X_train_counts)
    # clf = ComplementNB().fit(X_train_tfidf, y_train)
    
    tfidf_vect = TfidfVectorizer(ngram_range=(1,1),tokenizer=segmenter.tokenize)
    X_train_tfidf = tfidf_vect.fit_transform(X_train)
    # print(tfidf_vect.get_feature_names())
    # print(X_train_tfidf.shape)
    clf = ComplementNB().fit(X_train_tfidf, y_train)

    # Prepare input from user
    medicine_input = [[i] for i in medicine_input.split(' ')]

    # Compute probability for each classification then classify
    for med in medicine_input:
        isIrrelevant = True
        confidence = 0.0
        # print(med[0] + ": ")
        # class_probabilities = clf.predict_proba(count_vect.transform(med))
        class_probabilities = clf.predict_proba(tfidf_vect.transform(med))
        # print(class_probabilities)
        for idx, prob in enumerate(class_probabilities[0]):
            if prob >= 0.9 :
                isIrrelevant = False
                if confidence < prob :
                    confidence = prob
                
        # Classify string input
        if isIrrelevant :
            x = {"result" : {"query": med[0], "classification" : "Irrelevant", "confidence" : 1.0}}
            print(json.dumps(x))
            # print(json.dumps(x, ensure_ascii=False).encode('utf8').decode())
        else :
            x = {"result" : {"query": med[0], "classification" : clf.predict(tfidf_vect.transform(med))[0], "confidence" : confidence }}
            print(json.dumps(x))
            # print(json.dumps(x, ensure_ascii=False).encode('utf8').decode())
            
# Function to convert a list to string
def listToString(input_list):      
    output_string = ""  
    for item in input_list:  
        output_string += item    
    return output_string
        
if __name__ == '__main__':
    classify(sys.argv[1])
